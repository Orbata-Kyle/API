-- RenameIndex
ALTER TABLE `CastPerson` RENAME INDEX `CastPerson_personId_fkey` TO `CastPerson_personId_idx`;

-- RenameIndex
ALTER TABLE `CrewPerson` RENAME INDEX `CrewPerson_personId_fkey` TO `CrewPerson_personId_idx`;
